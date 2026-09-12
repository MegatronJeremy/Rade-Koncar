# Tag must equal the playwright version in package.json. A mismatch means the
# client looks for browser builds under a path the image does not have, and
# every render fails with what reads as broken infrastructure.
FROM mcr.microsoft.com/playwright:v1.63.0-noble AS build

WORKDIR /harness
COPY package.json package-lock.json ./
RUN npm ci
# Daytona builds the upload context by parsing COPY targets out of this file, so
# a glob uploads nothing and `tsc` then fails with "file not found" on every
# entry. These must be listed literally and must match tsconfig's `files`.
COPY tsconfig.json harness-window.d.ts render.ts snapshot.ts verify-sandbox.ts batch.ts ./
RUN npx tsc

FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /harness
COPY package.json package-lock.json ./
# --omit=dev keeps typescript and the Daytona SDK, which only the build stage
# and the operator need, out of the sandbox. playwright's postinstall is a
# no-op against the browsers already in /ms-playwright, so this doubles as a
# check that image and package agree on the version.
RUN npm ci --omit=dev

COPY --from=build /harness/render.js ./
COPY harness.html ./
COPY fixtures ./fixtures

# The base image's default command exits immediately; Daytona needs the
# container to stay up so it can exec into it.
CMD ["sleep", "infinity"]
