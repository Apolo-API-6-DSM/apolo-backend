import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsuarioModule } from './usuario/usuario.module';
import { ChamadoModule } from './chamado/chamado.module';

@Module({
  imports: [PrismaModule, UsuarioModule, ChamadoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
