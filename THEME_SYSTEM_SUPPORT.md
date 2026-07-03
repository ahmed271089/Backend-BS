# 🎨 Theme System Support - Backend API

## Vue d'Ensemble

Le Backend Best Solving supporte maintenant le système de thème de l'application mobile et du backoffice. Ce document explique comment le backend gère les préférences de thème des utilisateurs.

## 📊 Schéma de Base de Données

### Ajout du Champ Theme

Le modèle `User` dans Prisma inclut maintenant une préférence de thème :

```prisma
model User {
  id              String   @id @default(uuid())
  name            String
  email           String?  @unique
  phone           String?  @unique
  password        String
  avatarUrl       String?
  bio             String?
  reputationPoints Int     @default(0)
  isVerified      Boolean  @default(false)
  status          UserStatus @default(ACTIVE)
  role            UserRole   @default(USER)
  themePreference ThemeMode  @default(SYSTEM)  // 👈 Nouveau
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  // ... autres relations
}

enum ThemeMode {
  LIGHT
  DARK
  SYSTEM
}
```

## 🔧 API Endpoints

### 1. GET /users/me

Retourne les informations de l'utilisateur **incluant** sa préférence de thème :

**Response:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "themePreference": "DARK",
  "reputationPoints": 150,
  // ... autres champs
}
```

### 2. PATCH /users/me

Met à jour le profil de l'utilisateur, **incluant** la préférence de thème :

**Request Body:**
```json
{
  "name": "John Doe",
  "bio": "Software Engineer",
  "themePreference": "DARK"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "bio": "Software Engineer",
  "themePreference": "DARK",
  // ... autres champs
}
```

**Valeurs acceptées pour `themePreference`:**
- `"LIGHT"` - Mode clair
- `"DARK"` - Mode sombre
- `"SYSTEM"` - Suit les paramètres de l'appareil (défaut)

## 📧 Support des Thèmes dans les Emails

### Templates HTML

Les emails envoyés par le backend peuvent maintenant adapter leur apparence selon la préférence de l'utilisateur.

**Structure des Templates:**

```typescript
// src/email/templates/welcomeEmail.ts
export function getWelcomeEmailHTML(userName: string, themePreference: 'LIGHT' | 'DARK' | 'SYSTEM'): string {
  const isDark = themePreference === 'DARK';
  
  const colors = {
    bg: isDark ? '#0B0E16' : '#FFFFFF',
    card: isDark ? '#161A26' : '#F5F7FA',
    text: isDark ? '#F4F5F8' : '#111827',
    primary: '#6C5CE7',
  };

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="color-scheme" content="${isDark ? 'dark' : 'light'}">
      </head>
      <body style="background-color: ${colors.bg}; color: ${colors.text};">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: ${colors.primary};">Welcome, ${userName}!</h1>
          <div style="background: ${colors.card}; padding: 20px; border-radius: 8px;">
            <!-- Email content -->
          </div>
        </div>
      </body>
    </html>
  `;
}
```

### Services Email Modifiés

```typescript
// src/services/email.service.ts
async sendWelcomeEmail(user: User) {
  const html = getWelcomeEmailHTML(user.name, user.themePreference);
  
  await this.mailer.sendMail({
    to: user.email,
    subject: 'Welcome to Best Solving',
    html,
  });
}
```

## 🔔 Notifications Push

Les notifications push incluent maintenant des métadonnées de thème :

```typescript
// Payload de notification
{
  "title": "New Comment",
  "body": "Someone commented on your post",
  "data": {
    "postId": "123",
    "themePreference": "DARK" // 👈 Metadata
  }
}
```

Cela permet à l'application mobile d'afficher des notifications stylisées correctement.

## 🗄️ Migration de Base de Données

### Migration Prisma

```prisma
-- Add themePreference column
ALTER TABLE "User" ADD COLUMN "themePreference" "ThemeMode" NOT NULL DEFAULT 'SYSTEM';

-- Create enum if not exists
CREATE TYPE "ThemeMode" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');
```

**Commande:**
```bash
npx prisma migrate dev --name add_theme_preference
```

### Script de Migration (si nécessaire)

```typescript
// scripts/migrate-theme-preference.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Set default theme for existing users
  await prisma.user.updateMany({
    where: { themePreference: null },
    data: { themePreference: 'SYSTEM' },
  });

  console.log('✅ Theme preferences migrated');
}

main();
```

## 🧪 Tests

### Test du Endpoint

```typescript
// users.controller.spec.ts
describe('PATCH /users/me', () => {
  it('should update theme preference', async () => {
    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ themePreference: 'DARK' })
      .expect(200);

    expect(response.body.themePreference).toBe('DARK');
  });

  it('should reject invalid theme preference', async () => {
    await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ themePreference: 'INVALID' })
      .expect(400);
  });
});
```

## 📱 Intégration avec les Clients

### Mobile App (React Native)

```typescript
// Synchroniser la préférence avec le backend
async function syncThemePreference(mode: 'light' | 'dark' | 'system') {
  await api.patch('/users/me', {
    themePreference: mode.toUpperCase(),
  });
}

// Récupérer au login
const user = await api.get('/users/me');
setThemeMode(user.themePreference.toLowerCase());
```

### BackOffice (React)

```typescript
// Synchroniser la préférence admin
async function updateAdminTheme(theme: ThemeMode) {
  await fetch('/api/users/me', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ themePreference: theme }),
  });
}
```

## 🔍 Logging et Debugging

### Logger les Préférences

```typescript
// src/middleware/logger.middleware.ts
this.logger.log({
  userId: user.id,
  action: 'theme_changed',
  from: oldTheme,
  to: newTheme,
  timestamp: new Date(),
});
```

### Analytics

Les changements de thème peuvent être trackés pour analytics :

```typescript
// Track theme preference distribution
SELECT themePreference, COUNT(*) as count
FROM "User"
GROUP BY themePreference;

-- Results:
-- LIGHT:  1,234 (30%)
-- DARK:   2,456 (60%)
-- SYSTEM:   410 (10%)
```

## 🚀 Déploiement

### Variables d'Environnement

Aucune nouvelle variable nécessaire pour le système de thème.

### Rollback

Si besoin de rollback :

```sql
-- Remove column
ALTER TABLE "User" DROP COLUMN "themePreference";

-- Drop enum
DROP TYPE "ThemeMode";
```

## 📊 Monitoring

### Métriques à Surveiller

1. **Distribution des thèmes** - Quels modes sont les plus utilisés ?
2. **Changements de thème** - Fréquence des changements
3. **Performance email** - Impact du theming sur le rendu
4. **Erreurs de validation** - Valeurs invalides rejetées

### Queries Utiles

```sql
-- Users by theme preference
SELECT themePreference, COUNT(*) FROM "User" GROUP BY themePreference;

-- Recent theme changes (requires audit table)
SELECT * FROM "UserAudit" 
WHERE field = 'themePreference' 
ORDER BY createdAt DESC 
LIMIT 10;
```

## 🔒 Sécurité

- ✅ Le champ `themePreference` est **validé** côté backend
- ✅ Seules les valeurs enum sont acceptées
- ✅ L'utilisateur ne peut modifier que **sa propre** préférence
- ✅ Pas d'injection SQL possible (Prisma ORM)

## 📚 Ressources

- **Prisma Docs** : https://www.prisma.io/docs/concepts/components/prisma-schema/data-model
- **Email Theming** : https://www.caniemail.com/features/css-color-scheme/
- **NestJS Validation** : https://docs.nestjs.com/techniques/validation

---

**Status** : ✅ Production Ready  
**Version** : 1.1.0 - Theme Support  
**Date** : 2026-07-01
