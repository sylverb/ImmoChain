# ImmoChain  Project

Immochain est une plateforme décentralisée de vente et d'achat de parts de SCPI.

### Vidéo de présentation de l'application :
https://www.loom.com/share/9399881d4cf4416d8a5e1cfd69334dbf?sid=80970186-74a2-4a5b-961c-cdc3b1a25186

### Déploiement de l'application sur réseau Mumbai :
https://immo-chain.vercel.app/

### Tests
![](https://github.com/sylverb/ImmoChain/blob/main/images/Tests%20ScpiNFT.png?raw=true)
![](https://github.com/sylverb/ImmoChain/blob/main/images/Tests%20Marketplace.png?raw=true)
![](https://github.com/sylverb/ImmoChain/blob/main/images/Tests%20coverage.png?raw=true)

### Les user stories
- Les SCPI doivent être présentées de façon individuelles (les parts de différentes SCPI ne doivent pas être mélangées à l’affichage)
- Chaque SCPI doit pouvoir modifier le prix public de ses parts (car il peut être réévalué en fonction de l'état du marché immobilier ou d’autres critères)
- Le prix d’achat/vente des parts est fixé en % du prix public (100% / 90% puis par palier de 5% en dessous jusqu'à un minimum de 30%), il n’est pas possible de mettre un prix plus élevé que le prix public.
- Les parts doivent pouvoir être présentées des moins chères aux plus chères et des plus anciennes aux plus récentes pour chaque palier de prix. Chaque ligne représente un palier de prix et le nombre de parts disponible est indiqué pour chaque palier
- Les ventes doivent être présentées de façon individuelle anonymes (Nombre de parts disponibles pour chaque prix)
- L’acheteur achète les parts les moins chères en priorité (sauf dérogation)
- L’acheteur doit pouvoir acheter à un vendeur spécifique de façon dérogatoire (sur justificatif)
- L’utilisateur doit pouvoir voir de façon synthétique les SCPI dont il possède des parts et le nombre de parts qu’il possède pour chaque SCPI
- Lorsqu’un vendeur veut mettre en vente des parts d’une SCPI, il doit voir combien de parts il possède et combien il en a déjà mis en vente et à quel prix
- Le vendeur doit pouvoir spécifier le nombre de parts d’une SCPI qu’il souhaite mettre en vente
- L’acheteur doit pouvoir acheter plusieurs parts d’une SCPI et en spécifier le nombre
- Le vendeur doit pouvoir mettre en vente des parts à différents prix (Exemple : 10 parts à 100% du prix public et 50 parts à 90% du prix public)
- Lorsqu’un vendeur diminue le nombre de parts qu’il souhaite vendre, il faut retirer les plus récentes en premier

### Ce qui a été réalisé pendant ce sprint
![](https://github.com/sylverb/ImmoChain/blob/main/images/Sprint%20Backlog.png?raw=true)

![](https://github.com/sylverb/ImmoChain/blob/main/images/Burndown%20chart%20Sprint%204.png?raw=true)

### Contenu du product backlog
![](https://github.com/sylverb/ImmoChain/blob/main/images/Product%20backlog.png?raw=true)
