import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsuarioModule } from './usuario/usuario.module';
import { ChamadoModule } from './chamado/chamado.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ImportacaoModule } from './importacao/importacao.module';
import { InteracoesModule } from './interacoes/interacoes.module';

@Module({
  imports: [PrismaModule, UsuarioModule, ChamadoModule, MongooseModule.forRoot(process.env.MONGO_URI || ""), ConfigModule.forRoot(), ImportacaoModule, InteracoesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
