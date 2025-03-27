from flask import Flask, request, jsonify
from flask_cors import CORS
from lingua import Language, LanguageDetectorBuilder
from pymongo import MongoClient
from datetime import datetime
import os
import logging
from bson import ObjectId
import re
from threading import Lock

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # More specific CORS config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='app.log'
)
logger = logging.getLogger(__name__)

# MongoDB Configuration with connection pooling
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/lange')
client = MongoClient(MONGO_URI, maxPoolSize=50, connectTimeoutMS=5000)
db = client['lange']
history_collection = db['detection_history']
confidence_collection = db['confidence_scores']
stats_collection = db['detection_stats']

# Thread lock for database operations
db_lock = Lock()

# Language Detector Setup with more languages
languages = {
    'English': Language.ENGLISH, 'French': Language.FRENCH, 'German': Language.GERMAN,
    'Spanish': Language.SPANISH, 'Portuguese': Language.PORTUGUESE, 'Italian': Language.ITALIAN,
    'Russian': Language.RUSSIAN, 'Arabic': Language.ARABIC, 'Hindi': Language.HINDI,
    'Chinese': Language.CHINESE, 'Japanese': Language.JAPANESE, 'Korean': Language.KOREAN,
    'Vietnamese': Language.VIETNAMESE, 'Thai': Language.THAI, 'Dutch': Language.DUTCH,
    'Greek': Language.GREEK, 'Turkish': Language.TURKISH, 'Polish': Language.POLISH,
    'Danish': Language.DANISH, 'Finnish': Language.FINNISH, 'Hungarian': Language.HUNGARIAN,
    'Swedish': Language.SWEDISH, 'Indonesian': Language.INDONESIAN, 'Romanian': Language.ROMANIAN,
    'Bengali': Language.BENGALI, 'Persian': Language.PERSIAN, 'Hebrew': Language.HEBREW,
    'Urdu': Language.URDU, 'Tamil': Language.TAMIL, 'Malay': Language.MALAY
}
detector = LanguageDetectorBuilder.from_languages(*languages.values()).with_preloaded_language_models().build()

def check_db_connection():
    try:
        client.admin.command('ping')
        return True
    except Exception as e:
        logger.error(f"Database connection failed: {str(e)}")
        return False

def sanitize_text(text):
    """Clean text input and remove excessive whitespace"""
    return re.sub(r'\s+', ' ', text.strip())

@app.route('/api/detect', methods=['POST'])
def detect_language():
    try:
        data = request.get_json()
        text = sanitize_text(data.get('text', ''))
        
        if len(text) < 10:  # Reduced minimum length
            return jsonify({'error': 'Text must be at least 10 characters'}), 400

        detected_lang = detector.detect_language_of(text)
        if not detected_lang:
            return jsonify({'error': 'Could not detect language'}), 400

        confidences = detector.compute_language_confidence_values(text)
        sorted_confidences = sorted(confidences, key=lambda x: x.value, reverse=True)[:5]  # Top 5 only
        
        main_confidence = next((conf.value for lang, conf in sorted_confidences if lang == detected_lang), 0)
        
        if check_db_connection():
            with db_lock:
                history_doc = {
                    'timestamp': datetime.utcnow(),
                    'text_preview': text[:100] + '...' if len(text) > 100 else text,
                    'full_text': text,
                    'detected_language': detected_lang.name,
                    'confidence': float(main_confidence),
                    'user_ip': request.remote_addr,
                    'user_agent': request.headers.get('User-Agent')
                }
                result = history_collection.insert_one(history_doc)
                history_id = result.inserted_id

                confidence_docs = [
                    {
                        'history_id': history_id,
                        'language': lang.name,
                        'confidence': float(conf.value)
                    } for lang, conf in sorted_confidences
                ]
                confidence_collection.insert_many(confidence_docs)

                # Update statistics
                stats_collection.update_one(
                    {'language': detected_lang.name},
                    {'$inc': {'count': 1}, '$set': {'last_detected': datetime.utcnow()}},
                    upsert=True
                )

        response = {
            'detected_language': detected_lang.name,
            'confidence': float(main_confidence),
            'confidences': [[lang.name, float(conf.value)] for lang, conf in sorted_confidences],
            'text_length': len(text),
            'processing_time': datetime.utcnow().timestamp()
        }
        logger.info(f"Language detected: {detected_lang.name} (Confidence: {main_confidence:.2f})")
        return jsonify(response)

    except Exception as e:
        logger.error(f"Error in detect_language: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/history', methods=['GET'])
def get_history():
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        search = request.args.get('search', '')

        if not check_db_connection():
            return jsonify({'error': 'Database connection failed'}), 500

        query = {}
        if search:
            query['$or'] = [
                {'text_preview': {'$regex': search, '$options': 'i'}},
                {'detected_language': {'$regex': search, '$options': 'i'}}
            ]

        total = history_collection.count_documents(query)
        history = list(history_collection.find(
            query,
            {'_id': 0, 'timestamp': 1, 'text_preview': 1, 'detected_language': 1, 'confidence': 1}
        ).sort('timestamp', -1)
        .skip((page - 1) * per_page)
        .limit(per_page))

        for item in history:
            item['timestamp'] = item['timestamp'].isoformat()

        return jsonify({
            'history': history,
            'total': total,
            'page': page,
            'pages': (total + per_page - 1) // per_page
        })

    except Exception as e:
        logger.error(f"Error in get_history: {str(e)}")
        return jsonify({'error': 'Failed to fetch history'}), 500

@app.route('/api/history/<id>', methods=['GET'])
def get_history_detail(id):
    try:
        if not check_db_connection():
            return jsonify({'error': 'Database connection failed'}), 500

        history = history_collection.find_one(
            {'_id': ObjectId(id)},
            {'_id': 0, 'timestamp': 1, 'full_text': 1, 'detected_language': 1, 'confidence': 1}
        )
        if not history:
            return jsonify({'error': 'Record not found'}), 404

        history['timestamp'] = history['timestamp'].isoformat()
        confidences = list(confidence_collection.find(
            {'history_id': ObjectId(id)},
            {'_id': 0, 'language': 1, 'confidence': 1}
        ))
        
        return jsonify({
            'history': history,
            'confidences': confidences
        })

    except Exception as e:
        logger.error(f"Error in get_history_detail: {str(e)}")
        return jsonify({'error': 'Failed to fetch history detail'}), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        if not check_db_connection():
            return jsonify({'error': 'Database connection failed'}), 500

        stats = list(stats_collection.find(
            {},
            {'_id': 0, 'language': 1, 'count': 1, 'last_detected': 1}
        ).sort('count', -1).limit(10))

        for stat in stats:
            stat['last_detected'] = stat['last_detected'].isoformat()

        return jsonify(stats)

    except Exception as e:
        logger.error(f"Error in get_stats: {str(e)}")
        return jsonify({'error': 'Failed to fetch stats'}), 500

@app.route('/api/history', methods=['DELETE'])
def clear_history():
    try:
        if not check_db_connection():
            return jsonify({'error': 'Database connection failed'}), 500

        with db_lock:
            confidence_collection.delete_many({})
            history_collection.delete_many({})
            stats_collection.delete_many({})
        logger.info("History cleared by request")
        return jsonify({'message': 'History cleared successfully'}), 200

    except Exception as e:
        logger.error(f"Error in clear_history: {str(e)}")
        return jsonify({'error': 'Failed to clear history'}), 500

if __name__ == '__main__':
    app.run(debug=os.getenv('FLASK_DEBUG', 'False') == 'True', 
            host='0.0.0.0', 
            port=int(os.getenv('PORT', 5000)),
            threaded=True)