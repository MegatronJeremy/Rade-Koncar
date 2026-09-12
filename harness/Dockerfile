# Tag must equal the playwright version in package.json. A mismatch means the
# client looks for browser builds under a path the image does not have, and
# every render fails with what reads as broken infrastructure.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /harness

COPY package.json package-lock.json ./
# playwright's postinstall is a no-op against the browsers already in
# /ms-playwright, so this doubles as a check that image and package agree.
RUN npm ci

COPY tsconfig.json render.ts harness.html ./
COPY fixtures ./fixtures
RUN npx tsc

# The base image's default command exits immediately; Daytona needs the
# container to stay up so it can exec into it.
CMD ["sleep", "infinity"]
