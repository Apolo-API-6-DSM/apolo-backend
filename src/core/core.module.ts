// src/core/core.module.ts
import { Module } from '@nestjs/common';
import { BootstrapService } from './bootstrap.service';
import { UsuarioModule } from '../usuario/usuario.module';

@Module({
  imports: [UsuarioModule],
  providers: [BootstrapService],
})
export class CoreModule {}