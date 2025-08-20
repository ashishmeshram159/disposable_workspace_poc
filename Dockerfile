# ---- build stage: create a fresh Angular app and build it ----
FROM node:20 AS build

ENV NG_CLI_VERSION=18.2.5
WORKDIR /work

# Bring in mapping + generator
COPY mapping.json ./mapping.json
COPY generator.js ./generator.js

# Install Angular CLI
RUN npm i -g @angular/cli@${NG_CLI_VERSION}

# Create a brand-new Angular project (no prompts)
ARG PROJECT_NAME=site
RUN ng new ${PROJECT_NAME} --routing --style css --standalone --skip-git --package-manager npm --defaults

# Generate files from mapping
RUN node generator.js

# Build production
WORKDIR /work/${PROJECT_NAME}
RUN npm ci || npm install
RUN npm run build

# Collect artifacts into /out (stable path)
RUN mkdir -p /out && cp -r dist/* /out/

# ---- artifact stage: keep artifacts under /out (easier to copy) ----
FROM scratch AS artifact
COPY --from=build /out /out
