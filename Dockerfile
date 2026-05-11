# Usamos una versión ligera de Node.js
FROM node:18-alpine

# Creamos la carpeta de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiamos los archivos de dependencias
COPY package*.json ./

# Instalamos las librerías
RUN npm install

# Copiamos el resto de nuestro código
COPY . .

# Exponemos el puerto de nuestro servidor
EXPOSE 3000

# El comando para arrancar la app
CMD ["node", "app.js"]