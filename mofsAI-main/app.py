from flask import Flask, render_template, request, jsonify
import joblib
import numpy as np

app = Flask(__name__, template_folder='frontend', static_folder='frontend')

# تحميل الموديل والبيانات من ملفاتك
model = joblib.load('material_model.pkl')
features = joblib.load('features.pkl')

@app.route('/')
def index():
    # هذا سيفترض أن عندك ملف اسمه index.html داخل مجلد frontend
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    # تحويل البيانات المدخلة لتناسب الموديل
    inputs = [data[f] for f in features]
    prediction = model.predict([inputs])
    return jsonify({'result': float(prediction[0])})

if __name__ == '__main__':
    app.run(debug=True)
