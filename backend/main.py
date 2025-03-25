from flask import Flask, jsonify, request
from flask_cors import CORS
import numpy as np

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/', methods=['GET'])
def home():
    return jsonify({"message": "Welcome to the EM Mode Solver API!"})

@app.route('/simulate', methods=['POST'])
def simulate():
    try:
        data = request.json  # Receive user structure input
        print("Received data:", data)  # Debug log

        # Generate a dummy mode profile (10x10 grid)
        dummy_modes =  np.random.randint(0, 10, size=(10, 10)).tolist()
        #print("Generated modes:", dummy_modes)  # Debug log

        return jsonify({"success": True, "modes": dummy_modes})
    except Exception as e:
        print("Error:", str(e))  # Log the error
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
