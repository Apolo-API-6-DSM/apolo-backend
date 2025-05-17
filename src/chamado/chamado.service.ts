import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Chamado, Prisma } from '@prisma/client';
import { MongoClient } from 'mongodb';

interface ChamadoResultado {
  chamadoId: string;
  status: string;
  error?: string;
}

@Injectable()
export class ChamadoService {
  private readonly logger = new Logger(ChamadoService.name);
  private mongoClient: MongoClient;
  private db: any;

  constructor(private prisma: PrismaService) {
    this.connectToMongo();
  }

  private async connectToMongo() {
    try {
      const mongoUrl = process.env.MONGO_URI;

      if (!mongoUrl) {
        throw new Error('A variável de ambiente MONGO_URI não está definida.');
      }

      this.mongoClient = new MongoClient(mongoUrl);
      await this.mongoClient.connect();
      this.db = this.mongoClient.db();
      this.logger.log('Conectado ao MongoDB com sucesso.');
    } catch (error) {
      this.logger.error('Erro ao conectar ao MongoDB:', error.message);
    }
  }

  async criarChamado(data: any): Promise<Chamado> {
  try {
    const jsonKeywords: Prisma.InputJsonValue | undefined =
      data.keywords && Array.isArray(data.keywords) ? data.keywords : undefined;

    return await this.prisma.chamado.create({
      data: {
        ...data,
        keywords: jsonKeywords,
      },
    });
  } catch (error) {
    this.logger.error(`Erro ao criar chamado: ${error.message}`);
    throw error;
  }
}

  async listarChamados(): Promise<Chamado[]> {
    return this.prisma.chamado.findMany({
      orderBy: {
        ultima_atualizacao: 'desc'
      }
    });
  }

  async listarChamadosPaginados(page: number = 1, limit: number = 100): Promise<Chamado[]> {
    const offset = (page - 1) * limit;
    return this.prisma.chamado.findMany({
      skip: offset,
      take: limit,
      orderBy: {
        ultima_atualizacao: 'desc'
      }
    });
  }

  async listarPorStatus(status: string): Promise<Chamado[]> {
    return this.prisma.chamado.findMany({
      where: { status },
      orderBy: { ultima_atualizacao: 'desc' },
    });
  }

  async listarPorSentimento(sentimento: string): Promise<Chamado[]> {
    return this.prisma.chamado.findMany({
      where: { sentimento_cliente: sentimento },
      orderBy: { ultima_atualizacao: 'desc' },
    });
  }

  async listarPorTipoImportacao(tipo_importacao: string): Promise<Chamado[]> {
    return this.prisma.chamado.findMany({
      where: { tipo_importacao },
      orderBy: { ultima_atualizacao: 'desc' },
    });
  }

  async atualizarEmocoes(chamados: any[], nomeArquivoId: number): Promise<ChamadoResultado[]> {
    const resultados: ChamadoResultado[] = [];
    for (const chamado of chamados) {
      try {
        console.log(`Chamado: ${chamado}`)
        const { chamadoId, emocao, tipoChamado, sumarizacao } = chamado;

        await this.prisma.chamado.updateMany({
          where: { id_importado: chamadoId },
          data: {
            sentimento_cliente: emocao,
            tipo_documento: tipoChamado,
            sumarizacao: sumarizacao
          }
        });

        resultados.push({ chamadoId, status: 'atualizado' });
        this.logger.log(`Chamado ${chamadoId} atualizado com sucesso.`);

      } catch (error) {
        this.logger.error(`Erro ao atualizar chamado ${chamado.chamadoId}: ${error.message}`);
        resultados.push({ chamadoId: chamado.chamadoId, status: 'erro', error: error.message });
      }
    }
    try {
      await this.prisma.nomeArquivo.update({
        where: { id: nomeArquivoId },
        data: { status: "CONCLUIDO" }
      });
      this.logger.log(`Status do arquivo ${nomeArquivoId} atualizado para CONCLUIDO.`);
    } catch (error) {
      this.logger.error(`Erro ao atualizar status do arquivo ${nomeArquivoId} para CONCLUIDO: ${error.message}`);
    }

    return resultados;
  }

  async buscarChamadoPorId(id: string): Promise<any> {
    try {
      const chamado = await this.prisma.chamado.findUnique({
        where: { id_importado: id },
      });

      if (!chamado) {
        this.logger.warn(`Chamado com ID ${id} não encontrado no banco relacional.`);
        throw new NotFoundException(`Chamado com ID ${id} não encontrado.`);
      }

      if (!this.db) {
        await this.connectToMongo();
      }

      if (chamado.tipo_importacao === 'Jira') {
        const interacao = await this.db.collection('interacoes_processadas').findOne({ chamadoId: id });

        if (interacao && interacao.mensagem_limpa) {
          chamado['mensagem_limpa'] = interacao.mensagem_limpa;
        }
      } else if (chamado.tipo_importacao === 'Alternativo') {
        const interacaoAlternativa = await this.db.collection('interacoes_alternativas').findOne({ chamadoId: id });

        if (interacaoAlternativa) {
          chamado['descricao'] = interacaoAlternativa.descricao || null;
          chamado['solucao'] = interacaoAlternativa.solucao || null;
        }
      }

      return chamado;
    } catch (error) {
      this.logger.error(`Erro ao buscar chamado ${id}: ${error.message}`);
      throw error;
    }
  }

  async listarChamadosPorNomeArquivoId(nomeArquivoId: number): Promise<Chamado[]> {
    try {
      return await this.prisma.chamado.findMany({
        where: { nomeArquivoId },
        orderBy: { ultima_atualizacao: 'desc' }
      });
    } catch (error) {
      this.logger.error(`Erro ao listar chamados pelo NomeArquivoId ${nomeArquivoId}: ${error.message}`);
      throw error;
    }
  }
  async listarArquivosComInfo() {
    try {
      const arquivos = await this.prisma.nomeArquivo.findMany({
        include: {
          chamados: true
        },
        orderBy: {
          dataCriacao: 'desc'
        }
      });
  
      return arquivos.map(arquivo => {
        
        // Pega o tipo_importacao do primeiro chamado (ou um valor padrão)
        const tipoImportacao = arquivo.chamados.length > 0 
          ? arquivo.chamados[0].tipo_importacao 
          : 'DESCONHECIDO';
  
        return {
          'Tipo de Arquivo': tipoImportacao,
          'Nome de Arquivo': arquivo.nome,
          'Data da Importação': arquivo.dataCriacao.toLocaleString('pt-BR'),
          'Status': arquivo.status,
          'Quantidade de Dados': arquivo.chamados.length,
          'nomeArquivoId': arquivo.id // Adicionando o ID para uso no frontend
        };
      }).filter(arquivo => arquivo !== null);;

    } catch (error) {
      this.logger.error(`Erro ao listar informações de arquivos: ${error.message}`);
      throw error;
    }
  }

  async atualizarKeywords(chamadoId: string, keywords: any): Promise<Chamado> {
  try {
    const jsonKeywords: Prisma.InputJsonValue = Array.isArray(keywords) ? keywords : [];

    const chamado = await this.prisma.chamado.update({
      where: { id_importado: chamadoId },
      data: {
        keywords: jsonKeywords,
      },
    });

    this.logger.log(`Keywords atualizadas para o chamado ${chamadoId}`);
    return chamado;
  } catch (error) {
    this.logger.error(`Erro ao atualizar keywords do chamado ${chamadoId}: ${error.message}`);
    throw error;
  }
}
}
