import { Test, TestingModule } from '@nestjs/testing';
import { ImportacaoService } from './importacao.service';

describe('ImportacaoService', () => {
  let service: ImportacaoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImportacaoService],
    }).compile();

    service = module.get<ImportacaoService>(ImportacaoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
