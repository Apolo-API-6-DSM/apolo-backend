import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Chamado } from '@prisma/client';

interface ChamadoResultado {
  chamadoId: string;
  status: string;
  error?: string;
}

@Injectable()
export class ChamadoService {
  private readonly logger = new Logger(ChamadoService.name);
  constructor(private prisma: PrismaService) { }

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

  async atualizarEmocoes(chamados: any[]): Promise<ChamadoResultado[]> { 
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

    return resultados;
  }
}
