import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
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

  // usuario.service.ts

async listarUsuariosComChamados(): Promise<any[]> {
  const usuarios = await this.prisma.usuario.findMany({
    orderBy: { nome: 'asc' }
  });

  const chamados = await this.prisma.chamado.findMany({
    select: {
      id: true,
      responsavel: true // Agora comparando com usuario.nome
    }
  });

  return usuarios.map(usuario => {
    const chamadosUsuario = chamados.filter(c => c.responsavel === usuario.nome); // Comparação por nome
    return {
      ...usuario,
      status: usuario.status ? 'ativo' : 'inativo',
      quantidadeChamados: chamadosUsuario.length,
      ultimaAtividade: this.getUltimaAtividade(chamadosUsuario)
    };
  });
}

private getUltimaAtividade(chamados: any[]): string {
  if (!chamados || chamados.length === 0) return 'Nunca';
  
  const ultimoChamado = chamados.reduce((latest, current) => {
    const latestDate = new Date(latest.dataCriacao || 0);
    const currentDate = new Date(current.dataCriacao || 0);
    return currentDate > latestDate ? current : latest;
  });
  
  return ultimoChamado.dataCriacao 
    ? new Date(ultimoChamado.dataCriacao).toLocaleDateString() 
    : 'Nunca';
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

  async atualizarUsuario(id: string, data: { nome?: string; email?: string}) {
    return this.prisma.usuario.update({
      where: { id },
      data: {
        nome: data.nome,
        email: data.email
      }
    });
  }

  async encontrarPorId(id: string): Promise<Usuario | null> {
    return this.prisma.usuario.findUnique({ where: { id } });
  }

  async alterarSenha(id: string, senhaAtual: string, novaSenha: string) {
    // Encontre o usuário
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // Verifique a senha atual
    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);
    if (!senhaValida) {
      throw new BadRequestException('Senha atual incorreta');
    }

    // Crie o hash da nova senha
    const saltRounds = 10;
    const novaSenhaHash = await bcrypt.hash(novaSenha, saltRounds);

    // Atualize a senha
    return this.prisma.usuario.update({
      where: { id },
      data: { senha: novaSenhaHash }
    });
  }

  async toggleStatus(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return this.prisma.usuario.update({
      where: { id },
      data: { status: !usuario.status }
    });
  }

  async alterarSenhaAdmin(id: string, novaSenha: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const saltRounds = 10;
    const novaSenhaHash = await bcrypt.hash(novaSenha, saltRounds);

    return this.prisma.usuario.update({
      where: { id },
      data: { senha: novaSenhaHash }
    });
  }
}