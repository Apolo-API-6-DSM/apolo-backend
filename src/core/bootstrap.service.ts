// src/core/bootstrap.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { UsuarioService } from '../usuario/usuario.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BootstrapService implements OnModuleInit {
  constructor(private readonly usuarioService: UsuarioService) {}

  async onModuleInit() {
    await this.criarAdminPadrao();
  }

  private async criarAdminPadrao() {
    const adminData = {
      email: 'admin@example.com',
      senha: 'senha123',
      papel: 'admin',
      nome: 'Administrador Padrão',
      status: true
    };

    try {
      const usuarioExistente = await this.usuarioService.encontrarPorEmail(adminData.email);
      
      if (!usuarioExistente) {
        const senhaHash = await bcrypt.hash(adminData.senha, 10);
        await this.usuarioService.criarUsuario(
          adminData.email,
          adminData.senha,
          adminData.papel,
          adminData.nome
        );
        console.log('Usuário admin padrão criado com sucesso');
      } else {
        console.log('Usuário admin já existe, pulando criação');
      }
    } catch (error) {
      console.error('Erro ao criar usuário admin padrão:', error.message);
    }
  }
}