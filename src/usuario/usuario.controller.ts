import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsuarioService } from './usuario.service';

@Controller('usuarios')
export class UsuarioController {
  constructor(private readonly usuarioService: UsuarioService) {}

  @Post()
  criarUsuario(@Body() body: { email: string; senha: string; papel: string }) {
    return this.usuarioService.criarUsuario(body.email, body.senha, body.papel);
  }

  @Get()
  listarUsuarios() {
    return this.usuarioService.listarUsuarios();
  }
}
