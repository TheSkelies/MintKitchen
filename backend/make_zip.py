import os
import zipfile

OUTPUT_ZIP = "spo-products.zip"
EXCLUDE_DIRS = {".venv", "__pycache__", ".pytest_cache", ".git"}
EXCLUDE_EXTS = {".pyc", ".pyo", ".db", ".zip"}


def create_project_zip():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(base_dir, OUTPUT_ZIP)

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(base_dir):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for file in files:
                if any(file.endswith(ext) for ext in EXCLUDE_EXTS):
                    continue
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, start=base_dir)
                zipf.write(file_path, arcname)

    size_kb = round(os.path.getsize(output_path) / 1024, 1)
    print(f"✅ Архив успешно создан: {output_path} ({size_kb} KB)")


if __name__ == "__main__":
    create_project_zip()
