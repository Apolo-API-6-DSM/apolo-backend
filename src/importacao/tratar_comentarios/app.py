from flask import Flask, request, jsonify
import pandas as pd
import os
from werkzeug.utils import secure_filename
import uuid
from pymongo import MongoClient
from dotenv import load_dotenv
from datetime import datetime
from bson.objectid import ObjectId

# Carrega variáveis de ambiente
load_dotenv()

app = Flask(__name__)

# Configuração do MongoDB
MONGO_URI = os.getenv('MONGO_URI')
if not MONGO_URI:
    raise ValueError("MONGO_URI não configurada no ambiente")

class MongoDBClient:
    def __init__(self):
        self.client = MongoClient(MONGO_URI)
        self.db = self.client.get_default_database()  # Usa o database padrão da URI
        self.interacoes_collection = self.db['interacoes']
        
    def atualizar_comentarios(self, chamadoId, comentarios):
        """Atualiza o documento existente adicionando os comentários"""
        return self.interacoes_collection.update_one(
            {'chamadoId': str(chamadoId)},  # Note que estamos usando 'chamadoId' aqui
            {
                '$set': {
                    'comentarios': comentarios,
                    'updatedAt': datetime.utcnow()
                }
            },
            upsert=False  # Não cria novo documento se não existir
        )

mongo_client = MongoDBClient()

# Configurações
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

class ImportacaoService:
    def __init__(self):
        pass

    def importar_arquivo(self, file_path):
        try:
            df = pd.read_csv(file_path, encoding='utf-8', sep=',', dtype=str)
            total_atualizados = 0

            for _, row in df.iterrows():
                try:
                    chamadoId = row.get('ID da item')
                    if not chamadoId:
                        continue

                    # Formata os comentários
                    comentarios = self._formatar_comentarios(row)
                    if not comentarios:
                        continue

                    # Verifica se o documento existe antes de atualizar
                    doc_existente = mongo_client.interacoes_collection.find_one({'chamadoId': str(chamadoId)})
                    if not doc_existente:
                        app.logger.warning(f"Documento com chamadoId {chamadoId} não encontrado")
                        continue

                    # Atualiza o documento
                    result = mongo_client.atualizar_comentarios(chamadoId, comentarios)
                    if result.modified_count > 0:
                        total_atualizados += 1
                        app.logger.info(f"Comentários adicionados ao chamado {chamadoId}")

                except Exception as e:
                    app.logger.error(f"Erro ao processar chamado {chamadoId}: {str(e)}")
                    continue

            return {
                'success': True,
                'message': f'Comentários atualizados em {total_atualizados} chamados',
                'total_atualizados': total_atualizados
            }
        
        except Exception as e:
            app.logger.error(f"Erro ao processar arquivo: {str(e)}")
            return {'success': False, 'message': f'Erro ao processar arquivo: {str(e)}'}

    def _formatar_comentarios(self, row):
        """Formata os comentários mantendo a origem de cada um"""
        comentarios = []
        for col, value in row.items():
            if col.startswith('Comentar') and pd.notna(value) and str(value).strip():
                comentarios.append({
                    'origem': col,
                    'texto': str(value).strip(),
                    'tipo': 'comentario',
                    'timestamp': datetime.utcnow().isoformat()
                })
        return comentarios

@app.route('/processar', methods=['POST'])
def processar():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'Nenhum arquivo enviado'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'success': False, 'message': 'Nenhum arquivo selecionado'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'success': False, 'message': 'Apenas arquivos CSV são permitidos'}), 400
    
    try:
        # Salva temporariamente o arquivo
        temp_path = os.path.join(app.config['UPLOAD_FOLDER'], secure_filename(file.filename))
        file.save(temp_path)
        
        # Processa o arquivo
        service = ImportacaoService()
        result = service.importar_arquivo(temp_path)
        
        # Remove o arquivo temporário
        os.remove(temp_path)
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao processar arquivo: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8002, debug=True)