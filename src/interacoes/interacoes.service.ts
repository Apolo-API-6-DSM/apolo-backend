import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Interacoes, InteracoesDocument } from './interacoes.schema';
import { InteracoesAlternativas, InteracoesAlternativasDocument } from './interacoes-alternativas.schema';

@Injectable()
export class InteracoesService {
  constructor(
    @InjectModel(Interacoes.name) private interacoesModel: Model<InteracoesDocument>,
    @InjectModel(InteracoesAlternativas.name) private interacoesAltModel: Model<InteracoesAlternativasDocument>,
  ) {}

  async criarInteracao(
    chamadoId: string,
    mensagem: string,
    origem: string,
    usuario?: string,
  ): Promise<Interacoes> {
    const novaInteracao = new this.interacoesModel({ chamadoId, mensagem, origem, usuario });
    return novaInteracao.save();
  }

  async criarInteracaoAlternativa(
    chamadoId: string,
    descricao: string,
    solucao: string,
    origem: string,
    usuario?: string,
  ): Promise<InteracoesAlternativas> {
    const novaInteracaoAlt = new this.interacoesAltModel({
      chamadoId,
      descricao,
      solucao,
      origem,
      usuario,
      data: new Date(),
    });
    return novaInteracaoAlt.save();
  }
}
