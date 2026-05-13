export const downloadFile = (fileName: string, content?: string) => {
  // Dans un vrai cas, tu ferais un appel API pour récupérer le Blob du fichier.
  // Ici, on simule un téléchargement pour la démo.
  
  const element = document.createElement("a");
  const file = new Blob([content || "Contenu simulé du CV"], { type: "text/plain" });
  element.href = URL.createObjectURL(file);
  element.download = fileName;
  document.body.appendChild(element); // Requis pour Firefox
  element.click();
  document.body.removeChild(element);
};