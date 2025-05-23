import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InteracoesService } from '../interacoes/interacoes.service';
import * as csv from 'csv-parser';
import * as fs from 'fs';
import * as moment from 'moment';
import axios from 'axios';
import 'moment/locale/pt-br';
import * as FormData from 'form-data';
import * as path from 'path';

moment.locale('pt-br');

@Injectable()
export class ImportacaoService {
  private readonly logger = new Logger(ImportacaoService.name);
  private readonly PYTHON_API_URL_FASTAPI = 'http://localhost:8000/api/v1';

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

    try {      
      // Depois continua com o processamento normal
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
              
              await this.prisma.nomeArquivo.update({
                where: { id: arquivo.id },
                data: { status: "EM ANÁLISE" }
              });

              await this.enviarParaPythonAPI(filePath);

              resolve();
            } catch (error) {
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
    } catch (error) {
      await this.prisma.nomeArquivo.update({
        where: { id: arquivo.id },
        data: { status: "Erro ao processar" }
      });
      throw error;
    }
  }

  private async enviarParaPythonAPI(filePath: string): Promise<void> {
    try {
      this.logger.log(`Preparando para enviar arquivo: ${filePath}`);
      
      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      const formData = new FormData();
      const fileStream = fs.createReadStream(filePath);
      const fileName = path.basename(filePath);
      
      // Garante que o nome do arquivo termina com .csv
      const finalFileName = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
      
      formData.append('file', fileStream, {
        filename: finalFileName,
        contentType: 'text/csv',
        knownLength: fs.statSync(filePath).size
      });

      this.logger.log(`Enviando ${finalFileName} (${fs.statSync(filePath).size} bytes) para Python API...`);

      const response = await axios.post('http://127.0.0.1:8002/processar', formData, {
        headers: {
          ...formData.getHeaders(),
          'Accept': 'application/json'
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 30000
      });

      this.logger.log(`Resposta da Python API: ${response.status}`);
      this.logger.debug(`Detalhes da resposta:`, response.data);
      
      if (response.status !== 200) {
        throw new Error(`Resposta inesperada: ${response.status}`);
      }
    } catch (error) {
      let errorMessage = 'Erro desconhecido';
      
      if (axios.isAxiosError(error)) {
        errorMessage = `Erro na requisição: ${error.message}`;
        if (error.response) {
          errorMessage += ` | Status: ${error.response.status} | Data: ${JSON.stringify(error.response.data)}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      this.logger.error(`Erro detalhado ao enviar arquivo: ${errorMessage}`);
      throw new Error(`Falha ao processar arquivo com Python: ${errorMessage}`);
    }
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

  private async enviarIdsParaFastAPI(ids: string[], isAlternativo: boolean = false): Promise<void> {
    const BATCH_SIZE = 100;
    const endpoint = isAlternativo ? '/process-alternative' : '/process';

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);

        try {
            // Para o formato alternativo, envie os textos em vez dos IDs
            const payload = {
                ids: ids // Garanta que está enviando como {ids: [...]}
            };

            axios.post(`${this.PYTHON_API_URL_FASTAPI}${endpoint}`, payload)
                .then(response => {
                    if (response.status === 200) {
                        this.logger.log(`Lote de ${batch.length} itens enviado com sucesso para ${endpoint}!`);
                    } else {
                        this.logger.error(`Erro no envio do lote: ${response.status} - ${response.statusText}`);
                    }
                })
                .catch(error => {
                    this.logger.error(`Erro ao enviar lote para FastAPI: ${error.message}`);
                });

        } catch (error) {
            this.logger.error(`Erro ao enviar dados para FastAPI: ${error.message}`);
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

  async importarArquivoAlternativo(filePath: string, fileName: string): Promise<void> {
    const resultados: Record<string, any>[] = [];
    const idsProcessados: string[] = [];

    const arquivo = await this.prisma.nomeArquivo.create({
      data: {
        nome: fileName,
        status: "PROCESSANDO"
      }
    });

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
              await this.prisma.nomeArquivo.update({
                where: { id: arquivo.id },
                data: { status: "Erro ao processar" }
              });
              throw new BadRequestException('O arquivo não está no formato esperado do CSV Alternativo.');
            }

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
                    responsavel,
                    nomeArquivoId: arquivo.id
                  },
                  create: {
                    id_importado: idChamado,
                    titulo,
                    status,
                    data_abertura: dataAbertura,
                    ultima_atualizacao: ultimaAtualizacao,
                    responsavel,
                    tipo_importacao: 'Alternativo',
                    nomeArquivoId: arquivo.id
                  }
                });

                await this.interacoesService.criarInteracaoAlternativa(
                  idChamado,
                  descricao,
                  solucao,
                  'Alternativo',
                  responsavel
                );

                idsProcessados.push(idChamado);
              } catch (error) {
                this.logger.error(`Erro ao processar item ${item['ID']}`, error.stack);
              }
            }

            // Atualiza status para concluído
            await this.prisma.nomeArquivo.update({
              where: { id: arquivo.id },
              data: { status: "EM ANÁLISE" }
            });

            // Envia os IDs para pré-processamento no FastAPI
            if (idsProcessados.length > 0) {
              this.enviarIdsParaFastAPI(idsProcessados, true);
            }

            resolve();
          } catch (error) {
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
}