import { Module } from "@nestjs/common";
import { CoreModule } from './core/core.module'; 
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { UsuarioModule } from "./usuario/usuario.module";
import { ChamadoModule } from "./chamado/chamado.module";
import { AuthModule } from "./auth/auth.module";
import { MongooseModule } from "@nestjs/mongoose";
import { ImportacaoModule } from "./importacao/importacao.module";
import { InteracoesModule } from "./interacoes/interacoes.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Torna o ConfigModule disponível em toda a aplicação
      envFilePath: '.env', // Especifica o arquivo .env
    }),
    CoreModule,
    PrismaModule,
    UsuarioModule,
    ChamadoModule,
    AuthModule,
    MongooseModule.forRoot(process.env.MONGO_URI || ""),
    ImportacaoModule,
    InteracoesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}