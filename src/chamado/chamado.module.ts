import { Module } from '@nestjs/common';
import { ChamadoService } from './chamado.service';
import { ChamadoController } from './chamado.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ChamadoService],
  controllers: [ChamadoController]
})
export class ChamadoModule {}
