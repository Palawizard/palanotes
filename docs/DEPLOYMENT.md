# Deployment

How to run Palanotes in production at `https://palawi.fr/notes`.

## 1. Authentik provider and application

Create these in the Authentik admin interface (`https://auth.palawi.fr/if/admin/`).

### Provider

Applications > Providers > Create > **OAuth2/OpenID Provider**:

| Field                            | Value                                                        |
| -------------------------------- | ------------------------------------------------------------ |
| Name                             | `palanotes`                                                  |
| Authorization flow               | the default explicit consent flow, or implicit consent       |
| Client type                      | Confidential                                                 |
| Redirect URIs / Origins          | `https://palawi.fr/notes/api/auth/callback`, mode **Strict** |
| Signing key                      | the default certificate (RS256)                              |
| Subject mode (advanced settings) | **Based on the User's hashed ID** (`hashed_user_id`)         |
| Include claims in id_token       | enabled (the app reads the display name from the ID token)   |
| Scopes                           | `openid`, `profile`                                          |

Copy the generated **Client ID** and **Client Secret**: they go into `OIDC_CLIENT_ID` and `OIDC_CLIENT_SECRET`.

Do not change the subject mode later: accounts are keyed on `sub`, so a new mode would create new, empty accounts.

### Application

Applications > Applications > Create:

| Field      | Value                     |
| ---------- | ------------------------- |
| Name       | `Notes`                   |
| Slug       | `palanotes`               |
| Provider   | `palanotes`               |
| Launch URL | `https://palawi.fr/notes` |

Then open the application, tab **Policy / Group / User Bindings** > Bind existing group > `palawi-notes`. Create the group first if needed and add your user to it. Only members of this group can sign in.

The issuer is then `https://auth.palawi.fr/application/o/palanotes/` (with the trailing slash). Check it at `https://auth.palawi.fr/application/o/palanotes/.well-known/openid-configuration`: the `issuer` field must equal `OIDC_ISSUER` exactly.

### Your own subject

The subscription mode is reserved for your account (`LLM_OWNER_SUBJECT`). After your first sign-in, read your `sub`:

```sh
docker compose exec postgres psql -U palanotes -c "select auth_subject, display_name from users"
```

Put that value in `LLM_OWNER_SUBJECT` and restart the worker.

## 2. Environment

| Variable             | Production value                                       |
| -------------------- | ------------------------------------------------------ |
| `PUBLIC_URL`         | `https://palawi.fr`                                    |
| `BASE_PATH`          | `/notes`                                               |
| `SESSION_SECRET`     | 48 random bytes, for example `openssl rand -base64 48` |
| `OIDC_ISSUER`        | `https://auth.palawi.fr/application/o/palanotes/`      |
| `OIDC_CLIENT_ID`     | from the provider                                      |
| `OIDC_CLIENT_SECRET` | from the provider                                      |
| `OIDC_REDIRECT_URI`  | `https://palawi.fr/notes/api/auth/callback`            |

Changing `SESSION_SECRET` signs everyone out.
