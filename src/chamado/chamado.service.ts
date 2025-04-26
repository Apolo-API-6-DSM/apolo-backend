import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Chamado } from '@prisma/client';
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

  async criarChamado(data: Chamado): Promise<Chamado> {
    return this.prisma.chamado.create({ data });
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
        const { chamadoId, emocao, tipoChamado } = chamado;

        await this.prisma.chamado.updateMany({
          where: { id_importado: chamadoId },
          data: {
            sentimento_cliente: emocao,
            tipo_documento: tipoChamado
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
}
