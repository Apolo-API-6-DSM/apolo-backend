import { Test, TestingModule } from '@nestjs/testing';
import { InteracoesService } from './interacoes.service';

describe('InteracoesService', () => {
  let service: InteracoesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InteracoesService],
    }).compile();

    service = module.get<InteracoesService>(InteracoesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
