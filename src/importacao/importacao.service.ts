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

  async importarArquivo(filePath: string, fileName: string): Promise<void> {
    const resultados: Record<string, any>[] = [];

    const arquivo = await this.prisma.nomeArquivo.create({
      data: {
        nome: fileName,
        status: "PROCESSANDO"
      }
    });

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data: Record<string, any>) => resultados.push(data))
        .on('end', async () => {
          try {
            if (!this.validarFormato(resultados[0])) {
              await this.prisma.nomeArquivo.update({
                where: { id: arquivo.id },
                data: { status: "Erro ao processar" }
              });
              throw new BadRequestException('O arquivo não está no formato esperado do Jira');
            }
            await this.salvarChamados(resultados, arquivo.id);
            // Atualiza status para concluído
            await this.prisma.nomeArquivo.update({
              where: { id: arquivo.id },
              data: { status: "EM ANÁLISE" }
            });

            resolve();
          } catch (error) {
            // Em caso de erro, atualiza o status
            await this.prisma.nomeArquivo.update({
              where: { id: arquivo.id },
              data: { status: "Erro ao processar" }
            });
            reject(error);
          }
        })
        .on('error', async (error) => {
          await this.prisma.nomeArquivo.update({
            where: { id: arquivo.id },
            data: { status: "Erro ao processar" }
          });
          reject(error);
        });
    });
  }

  validarFormato(primeiraLinha: Record<string, any>): boolean {
    const colunasEsperadas = ['Resumo', 'ID da item', 'Status', 'Criado', 'Categoria do status alterada', 'Responsável'];
    return colunasEsperadas.every(coluna => coluna in primeiraLinha);
  }

  async salvarChamados(dados: any[], nomeArquivoId: number): Promise<void> {
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
            responsavel: item['Responsável'],
            nomeArquivoId: nomeArquivoId
          },
          create: {
            id_importado: item['ID da item'],
            titulo: item['Resumo'],
            status: this.padronizarStatus(item['Status']),
            data_abertura: dataAbertura,
            ultima_atualizacao: ultimaAtualizacao,
            responsavel: item['Responsável'],
            tipo_importacao: 'Jira',
            nomeArquivoId: nomeArquivoId
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
  
    if (['resolvido', 'concluído(a)', 'fechado'].includes(status)) {
      return 'Concluído';
    }
  
    if (['cancelado'].includes(status)) {
      return 'Cancelado';
    }
  
    if (
      ['em andamento', 'sob análise', 'itens pendentes', 'aguardando pelo suporte', 'processando (atribuído)'].includes(status)
    ) {
      return 'Em aberto';
    }
  
    return 'Em aberto';
  }

  async importarArquivoAlternativo(filePath: string): Promise<void> {
    const resultados: Record<string, any>[] = [];
  
    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv({ separator: ';' }))
        .on('data', (data: Record<string, any>) => resultados.push(data))
        .on('end', async () => {
          try {
            const colunas = [
              'ID',
              'Título',
              'Status',
              'Data de abertura',
              'Última atualização',
              'Descrição',
              'Solução - Solução',
              'Atribuído para - Técnico'
            ];
  
            if (!colunas.every(col => col in resultados[0])) {
              throw new BadRequestException('O arquivo não está no formato esperado do CSV Alternativo.');
            }
  
            const chamadosParaIA: { chamadoId: string; descricao: string }[] = [];
  
            for (const item of resultados) {
              try {
                const idChamado = item['ID'];
                const titulo = item['Título'] || 'Sem título';
                const status = this.padronizarStatus(item['Status']);
                const dataAbertura = moment(item['Data de abertura'], 'DD/MM/YYYY HH:mm').toDate();
                const ultimaAtualizacao = moment(item['Última atualização'], 'DD/MM/YYYY HH:mm').toDate();
                const responsavel = item['Atribuído para - Técnico'] || 'Não informado';
                const descricao = (item['Descrição'] || '').trim();
                const solucao = (item['Solução - Solução'] || '').trim();
  
                if (isNaN(dataAbertura.getTime())) {
                  this.logger.warn(`Data inválida para o chamado ${idChamado}`);
                  continue;
                }
  
                await this.prisma.chamado.upsert({
                  where: { id_importado: idChamado },
                  update: {
                    titulo,
                    status,
                    data_abertura: dataAbertura,
                    ultima_atualizacao: ultimaAtualizacao,
                    responsavel
                  },
                  create: {
                    id_importado: idChamado,
                    titulo,
                    status,
                    data_abertura: dataAbertura,
                    ultima_atualizacao: ultimaAtualizacao,
                    responsavel,
                    tipo_importacao: 'Alternativo'
                  }
                });
  
                await this.interacoesService.criarInteracaoAlternativa(
                  idChamado,
                  descricao,
                  solucao,
                  'Alternativo',
                  responsavel
                );

                const mensagemParaIA = `${descricao} ${solucao}`.trim();
                if (mensagemParaIA) {
                  chamadosParaIA.push({
                    chamadoId: idChamado,
                    descricao: mensagemParaIA
                  });
                }
              } catch (error) {
                this.logger.error(`Erro ao processar item ${item['ID']}`, error.stack);
              }
            }
  
            const BATCH_SIZE = 100;
  
            for (let i = 0; i < chamadosParaIA.length; i += BATCH_SIZE) {
              const lote = chamadosParaIA.slice(i, i + BATCH_SIZE);
  
              try {
                const response = await axios.post('http://localhost:8080/prever', {
                  chamados: lote
                }, {
                  headers: { 'Content-Type': 'application/json' },
                  timeout: 300_000
                });
  
                this.logger.log(`Lote ${i / BATCH_SIZE + 1} enviado com sucesso à IA. Status: ${response.status}`);
  
                const resultados = response.data?.chamados || [];
  
                for (const resultado of resultados) {
                  const { chamadoId, emocao, tipoChamado } = resultado;
  
                  if (!chamadoId) continue;
  
                  try {
                    await this.prisma.chamado.updateMany({
                      where: { id_importado: chamadoId },
                      data: {
                        sentimento_cliente: emocao,
                        tipo_documento: tipoChamado
                      }
                    });
  
                    this.logger.log(`Chamado ${chamadoId} atualizado com emoção: ${emocao}, tipo: ${tipoChamado}`);
                  } catch (error) {
                    this.logger.error(`Erro ao atualizar chamado ${chamadoId}: ${error.message}`);
                  }
                }
  
              } catch (error) {
                this.logger.error(`Erro ao enviar lote para IA: ${error.message}`);
              }
            }
  
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => reject(error));
    });
  }
}