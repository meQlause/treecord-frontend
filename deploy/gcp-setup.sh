#!/usr/bin/env bash
# One-off Google Cloud setup for the web app's CI/CD. Run it once, as an Owner:
#
#   gcloud auth login
#   bash deploy/gcp-setup.sh
#
# Safe to run again. It creates the runtime service account treecord-web (it needs no permissions: nginx serves
# static files) and the deployer GitHub Actions signs in as, which only the master branch of
# meQlause/treecord-frontend may become. No key is created or stored.
set -euo pipefail

PROJECT=treecord-512605
REGION=asia-southeast1
REPO=meQlause/treecord-frontend
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
SA() { echo "$1@$PROJECT.iam.gserviceaccount.com"; }

for account in frontend-deployer treecord-web; do
  gcloud iam service-accounts describe "$(SA $account)" --project "$PROJECT" >/dev/null 2>&1 ||
    gcloud iam service-accounts create "$account" --display-name "$account" --project "$PROJECT"
done

gcloud projects add-iam-policy-binding "$PROJECT" --member "serviceAccount:$(SA frontend-deployer)" \
  --role roles/run.admin --condition None --quiet >/dev/null
gcloud artifacts repositories add-iam-policy-binding treecord --location "$REGION" --project "$PROJECT" \
  --member "serviceAccount:$(SA frontend-deployer)" --role roles/artifactregistry.writer --quiet >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$(SA treecord-web)" --project "$PROJECT" \
  --member "serviceAccount:$(SA frontend-deployer)" --role roles/iam.serviceAccountUser --quiet >/dev/null

gcloud iam workload-identity-pools providers describe github-frontend --location global \
  --workload-identity-pool github --project "$PROJECT" >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc github-frontend --location global \
    --workload-identity-pool github --project "$PROJECT" \
    --issuer-uri "https://token.actions.githubusercontent.com" \
    --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition "assertion.repository=='$REPO' && assertion.ref=='refs/heads/master'"
gcloud iam service-accounts add-iam-policy-binding "$(SA frontend-deployer)" --project "$PROJECT" \
  --role roles/iam.workloadIdentityUser --quiet >/dev/null \
  --member "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/$REPO"

echo "Done. A merge to master of $REPO now builds and deploys treecord-web."
