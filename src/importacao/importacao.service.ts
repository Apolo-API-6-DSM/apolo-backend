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
  private readonly PYTHON_API_URL_FASTAPI = 'http://localhost:8000/api/v1/process';

  constructor(
    private prisma: PrismaService,
    private interacoesService: InteracoesService
  ) { }

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
            status: this.padronizarStatus(item['Status']),
            data_abertura: dataAbertura,
            ultima_atualizacao: ultimaAtualizacao,
            responsavel: item['Responsável']
          },
          create: {
            id_importado: item['ID da item'],
            titulo: item['Resumo'],
            status: this.padronizarStatus(item['Status']),
            data_abertura: dataAbertura,
            ultima_atualizacao: ultimaAtualizacao,
            responsavel: item['Responsável'],
            tipo_importacao: 'Jira'
          }
        });

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

    if (idsProcessados.length > 0) {
      this.enviarIdsParaFastAPI(idsProcessados);
    }
  }

  private async enviarIdsParaFastAPI(ids: string[]): Promise<void> {
    const BATCH_SIZE = 100;

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);

      try {
        axios.post(this.PYTHON_API_URL_FASTAPI, { ids: batch })
          .then(response => {
            if (response.status === 200) {
              this.logger.log(`Lote de ${batch.length} IDs enviado com sucesso!`);
            } else {
              this.logger.error(`Erro no envio do lote: ${response.status} - ${response.statusText}`);
            }
          })
          .catch(error => {
            this.logger.error(`Erro ao enviar lote de IDs para FastAPI: ${error.message}`);
          });

      } catch (error) {
        this.logger.error(`Erro ao enviar IDs para FastAPI: ${error.message}`);
      }
    }
  }

  private padronizarStatus(statusOriginal: string): string {
    const status = statusOriginal.trim().toLowerCase();
  
    if (['resolvido', 'concluído(a)'].includes(status)) {
      return 'Concluído';
    }
  
    if (['cancelado'].includes(status)) {
      return 'Cancelado';
    }
  
    if (
      ['em andamento', 'sob análise', 'itens pendentes', 'aguardando pelo suporte'].includes(status)
    ) {
      return 'Em aberto';
    }
  
    return 'Em aberto';
  }
}