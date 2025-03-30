import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Interacoes, InteracoesDocument } from './interacoes.schema';

@Injectable()
export class InteracoesService {
  constructor(@InjectModel(Interacoes.name) private interacoesModel: Model<InteracoesDocument>) {}

  async criarInteracao(
    chamadoId: string,
    mensagem: string,
    origem: string,
    usuario?: string,
  ): Promise<Interacoes> {
    const novaInteracao = new this.interacoesModel({ chamadoId, mensagem, origem, usuario });
    return novaInteracao.save();
  }
}
