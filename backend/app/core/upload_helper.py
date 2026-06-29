import uuid, os
from fastapi import UploadFile, HTTPException

ALLOWED_PDF = {"application/pdf"}

ALLOWED_AUDIO = {
    "audio/webm", "audio/ogg", "audio/mp4",
    "audio/mpeg", "audio/wav", "audio/x-wav"
}


async def valider_et_sauvegarder(
    fichier: UploadFile,
    dossier: str,
    types_autorises: set,
    taille_max_mb: int,
) -> str:
    if fichier.content_type not in types_autorises:
        raise HTTPException(400, f"Type de fichier non autorisé : {fichier.content_type}")

    contenu = await fichier.read()
    taille_max = taille_max_mb * 1024 * 1024
    if len(contenu) > taille_max:
        raise HTTPException(400, f"Fichier trop volumineux (max {taille_max_mb} Mo)")

    ext = os.path.splitext(fichier.filename or "")[1].lower() or ".bin"
    nom_securise = f"{uuid.uuid4()}{ext}"
    chemin = os.path.join(dossier, nom_securise)

    os.makedirs(dossier, exist_ok=True)
    with open(chemin, "wb") as f:
        f.write(contenu)

    return nom_securise
