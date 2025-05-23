import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Usuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuarioService {
  constructor(private prisma: PrismaService) { }

  async criarUsuario(email: string, senha: string, papel: string, nome: string) {
    const saltRounds = 10;
    const senhaHash = await bcrypt.hash(senha, saltRounds);

    return this.prisma.usuario.create({
      data: {
        email,
        senha: senhaHash,
        papel,
        nome,
        status: true,
      },
    });
  }

  async listarUsuarios(): Promise<Usuario[]> {
    return this.prisma.usuario.findMany();
  }

  async desativarUsuario(id: string): Promise<Usuario> {
    return this.prisma.usuario.update({
      where: { id },
      data: { status: false },
    });
  }

  async encontrarPorEmail(email: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({ where: { email } });
  }
}