import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InteracoesService } from '../interacoes/interacoes.service';
import * as csv from 'csv-parser';
import * as fs from 'fs';
import * as moment from 'moment';
import 'moment/locale/pt-br';

moment.locale('pt-br');

@Injectable()
export class ImportacaoService {
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
    for (const item of dados) {
      // Converte as datas utilizando o formato correto
      const dataAbertura = moment(item['Criado'], 'DD/MMM/YY hh:mm A').toDate();
      const ultimaAtualizacao = moment(item['Categoria do status alterada'], 'DD/MMM/YY hh:mm A').toDate();
  
      // Verifica se as datas são válidas
      if (isNaN(dataAbertura.getTime())) {
        console.log(`Data de abertura inválida para o chamado: ${item['ID da item']}, valor original: ${item['Criado']}`);
        throw new BadRequestException(`Data de abertura inválida para o chamado: ${item['ID da item']}`);
      }
  
      if (isNaN(ultimaAtualizacao.getTime())) {
        console.log(`Data de última atualização inválida para o chamado: ${item['ID da item']}, valor original: ${item['Categoria do status alterada']}`);
        throw new BadRequestException(`Data de última atualização inválida para o chamado: ${item['ID da item']}`);
      }
  
      // Verifica se o chamado já existe no banco de dados
      const chamadoExistente = await this.prisma.chamado.findUnique({
        where: { id_importado: item['ID da item'] }
      });
  
      if (chamadoExistente) {
        // Atualiza o chamado existente
        await this.prisma.chamado.update({
          where: { id_importado: item['ID da item'] },
          data: {
            titulo: item['Resumo'] || 'Sem Título',
            status: item['Status'],
            data_abertura: dataAbertura,
            ultima_atualizacao: ultimaAtualizacao,
            responsavel: item['Responsável'] || 'Não Informado',
          },
        });
      } else {
        // Cria um novo chamado se ele não existir
        await this.prisma.chamado.create({
          data: {
            titulo: item['Resumo'] || 'Sem Título',
            id_importado: item['ID da item'],
            status: item['Status'],
            data_abertura: dataAbertura,
            ultima_atualizacao: ultimaAtualizacao,
            responsavel: item['Responsável'] || 'Não Informado',
            tipo_importacao: 'Jira',
          },
        });
      }
  
      // Prepara o campo mensagem para o MongoDB
      const mensagem = item['Descrição'] && item['Descrição'].trim() ? item['Descrição'] : 'Nenhuma descrição fornecida.';
  
      // Salva os dados no banco não relacional (MongoDB)
      await this.interacoesService.criarInteracao(
        item['ID da item'],
        mensagem,
        'Jira',
        item['Responsável'] || 'Não Informado'
      );
    }
  }
}
