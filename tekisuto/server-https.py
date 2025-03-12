import google.generativeai as genai
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
import ssl
import socket
import urllib

# Google Gemini API設定
#GOOGLE_API_KEYに自分のAPIキーを入力してください！
GOOGLE_API_KEY = "YOUR_API_KEY"
genai.configure(api_key=GOOGLE_API_KEY)
model = genai.GenerativeModel('gemini-1.5-flash')

class MyHandler(SimpleHTTPRequestHandler):
    def htmlheader(self):  # HTTPヘッダーを出力
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        if self.path.endswith('favicon.ico'):
            return

        p = urllib.parse.urlparse(self.path)

        if p.path == "/send":
            self.htmlheader()
            params = urllib.parse.parse_qs(p.query)
            q = params.get("q", [""])[0]  # テキスト入力値

            if q:  # 入力がある場合のみ処理
                translations = {}
                languages = {"英語": "English", "中国語": "Chinese", "韓国語": "Korean"}

                for lang_jp, lang in languages.items():
                    prompt = f"「{q}」を{lang}に翻訳してください。説明文や余計な分は入れず、翻訳結果だけを表示してください。"
                    response = model.generate_content(prompt)
                    translations[lang_jp] = response.text.strip()

                answer = "<b>翻訳結果:</b><br>"
                for lang, result in translations.items():
                    answer += f"<b>{lang}:</b> {result}<br>"

            else:
                answer = "<b>エラー: 入力が指定されていません。</b>"

            self.wfile.write(answer.encode('utf-8'))

        else:
            super().do_GET()

# HTTPSサーバー設定
host = socket.gethostbyname(socket.gethostname())
port = 8000
httpd = HTTPServer((host, port), MyHandler)
httpd.socket = ssl.wrap_socket(httpd.socket, certfile='server.pem', server_side=True)
print(f'Ready! Access at https://{host}:{port}')
httpd.serve_forever()
