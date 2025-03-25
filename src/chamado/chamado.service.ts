import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Chamado } from '@prisma/client';

@Injectable()
export class ChamadoService {
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
}
