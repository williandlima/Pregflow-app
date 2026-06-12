import subprocess
import sys
import os

# Lista de bibliotecas
bibliotecas = [

    # ===============================
    # Interface gráfica GUI
    # ===============================
    "tk",
    "customtkinter",
    "PyQt5",
    "PyQt6",
    "PySide6",
    "kivy",
    "flet",
    "ttkbootstrap",
    "DearPyGui",

    # ===============================
    # Automação Desktop
    # ===============================
    "pyautogui",
    "pynput",
    "keyboard",
    "mouse",
    "pyperclip",
    "screeninfo",
    "pygetwindow",
    "playsound",

    # ===============================
    # Automação Web
    # ===============================
    "selenium",
    "playwright",
    "requests",
    "httpx",
    "beautifulsoup4",
    "lxml",
    "scrapy",
    "fake-useragent",

    # ===============================
    # APIs
    # ===============================
    "fastapi",
    "flask",
    "django",
    "uvicorn",
    "pydantic",

    # ===============================
    # Banco de Dados
    # ===============================
    "sqlalchemy",
    "sqlite-utils",
    "pymysql",
    "psycopg2-binary",
    "redis",
    "pymongo",

    # ===============================
    # Dados
    # ===============================
    "numpy",
    "pandas",
    "openpyxl",
    "xlsxwriter",
    "xlrd",
    "polars",

    # ===============================
    # Gráficos
    # ===============================
    "matplotlib",
    "plotly",
    "seaborn",

    # ===============================
    # IA / Machine Learning
    # ===============================
    "scikit-learn",
    "tensorflow",
    "torch",
    "transformers",
    "openai",
    "langchain",

    # ===============================
    # Visão Computacional
    # ===============================
    "opencv-python",
    "pillow",
    "imageio",
    "pytesseract",

    # ===============================
    # PDF / Documentos
    # ===============================
    "pypdf",
    "PyMuPDF",
    "python-docx",
    "python-pptx",
    "reportlab",

    # ===============================
    # Comunicação / Serial / Hardware
    # ===============================
    "pyserial",
    "pyvisa",
    "pyusb",
    "minimalmodbus",

    # ===============================
    # Rede
    # ===============================
    "scapy",
    "netifaces",
    "paramiko",

    # ===============================
    # Utilidades
    # ===============================
    "python-dotenv",
    "loguru",
    "rich",
    "tqdm",
    "schedule",
    "apscheduler",
    "arrow",

    # ===============================
    # Testes e qualidade
    # ===============================
    "pytest",
    "pytest-cov",
    "black",
    "flake8",
    "isort",

]


def instalar(pacote):
    try:
        print(f"\nInstalando: {pacote}")

        subprocess.check_call(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                pacote
            ]
        )

        print(f"OK: {pacote}")

    except Exception as erro:
        print(f"Falhou: {pacote}")
        print(erro)



print("="*60)
print(" ATUALIZANDO PIP ")
print("="*60)

subprocess.call(
    [
        sys.executable,
        "-m",
        "pip",
        "install",
        "--upgrade",
        "pip"
    ]
)


print("\n")
print("="*60)
print(" INSTALANDO BIBLIOTECAS ")
print("="*60)


for lib in bibliotecas:
    instalar(lib)


print("\n")
print("="*60)
print(" FINALIZADO ")
print("="*60)

print("""
Ambiente pronto.

Sugestão:
- Reinicie o VS Code
- Crie seu ambiente virtual:
  python -m venv .venv

- Ative:
  Windows:
  .venv\\Scripts\\activate

  Linux:
  source .venv/bin/activate
""")
