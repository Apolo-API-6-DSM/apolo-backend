import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Chamado } from '@prisma/client';

@Injectable()
export class ChamadoService {
  constructor(private prisma: PrismaService) {}

  async criarChamado(data: Chamado): Promise<Chamado> {
    return this.prisma.chamado.create({ data });
  }

  async listarChamados(): Promise<Chamado[]> {
    return this.prisma.chamado.findMany();
  }
}
