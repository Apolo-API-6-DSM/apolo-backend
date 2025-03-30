import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Usuario } from '@prisma/client';

@Injectable()
export class UsuarioService {
  constructor(private prisma: PrismaService) {}

  async criarUsuario(email: string, senha: string, papel: string): Promise<Usuario> {
    return this.prisma.usuario.create({
      data: { email, senha, papel },
    });
  }

  async listarUsuarios(): Promise<Usuario[]> {
    return this.prisma.usuario.findMany();
  }
}