from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
	return {"mensaje": "Servidor API funcionando"}
