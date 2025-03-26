import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InteracoesService } from '../interacoes/interacoes.service';
import * as csv from 'csv-parser';
import * as fs from 'fs';
import * as moment from 'moment';
import axios from 'axios';
import 'moment/locale/pt-br';

moment.locale('pt-br');

@Injectable()
export class ImportacaoService {
  private readonly logger = new Logger(ImportacaoService.name);
  private readonly PYTHON_API_URL = 'http://localhost:8000/api/v1/process';
  
  constructor(
    private prisma: PrismaService,
    private interacoesService: InteracoesService
  ) {}

  async importarArquivo(filePath: string): Promise<void> {
    const resultados: Record<string, any>[] = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: Record<string, any>) => resultados.push(data))
        .on('end', async () => {
          try {
            if (!this.validarFormato(resultados[0])) {
              throw new BadRequestException('O arquivo não está no formato esperado do Jira');
            }
            await this.salvarChamados(resultados);
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => reject(error));
    });
  }

  validarFormato(primeiraLinha: Record<string, any>): boolean {
    const colunasEsperadas = ['Resumo', 'ID da item', 'Status', 'Criado', 'Categoria do status alterada', 'Responsável'];
    return colunasEsperadas.every(coluna => coluna in primeiraLinha);
  }

  async salvarChamados(dados: any[]): Promise<void> {
    const idsProcessados: string[] = [];

    for (const item of dados) {
      try {
        // Processamento do MySQL (mantido igual)
        const dataAbertura = moment(item['Criado'], 'DD/MMM/YY hh:mm A').toDate();
        const ultimaAtualizacao = moment(item['Categoria do status alterada'], 'DD/MMM/YY hh:mm A').toDate();

        if (isNaN(dataAbertura.getTime())) {
          this.logger.warn(`Data inválida para o chamado ${item['ID da item']}`);
          continue;
        }

        await this.prisma.chamado.upsert({
          where: { id_importado: item['ID da item'] },
          update: {
            titulo: item['Resumo'],
            status: item['Status'],
            data_abertura: dataAbertura,
            ultima_atualizacao: ultimaAtualizacao,
            responsavel: item['Responsável']
          },
          create: {
            id_importado: item['ID da item'],
            titulo: item['Resumo'],
            status: item['Status'],
            data_abertura: dataAbertura,
            ultima_atualizacao: ultimaAtualizacao,
            responsavel: item['Responsável'],
            tipo_importacao: 'Jira'
          }
        });

        // Salva no MongoDB
        await this.interacoesService.criarInteracao(
          item['ID da item'],
          item['Descrição']?.trim() || 'Nenhuma descrição',
          'Jira',
          item['Responsável']
        );

        idsProcessados.push(item['ID da item']);

      } catch (error) {
        this.logger.error(`Erro ao processar item ${item['ID da item']}`, error.stack);
      }
    }

    // Envia apenas os IDs para o Python após salvar tudo
    if (idsProcessados.length > 0) {
      await this.enviarIdsParaPython(idsProcessados);
    }
  }

  private async enviarIdsParaPython(ids: string[]): Promise<void> {
    try {
      // Opção 1: Enviar como objeto
      const response = await axios.post(this.PYTHON_API_URL, {
        ids: ids
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        // timeout: 1200000 //2 minuto
      });
  
      // Opção 2: Enviar como array direto
      // const response = await axios.post(this.PYTHON_API_URL, ids, {...});
      
      this.logger.debug('Resposta do Python:', response.data);
    } catch (error) {
      this.logger.error('Erro ao enviar IDs para Python:', {
        error: error.response?.data || error.message,
        status: error.response?.status
      });
    }
  }
}
