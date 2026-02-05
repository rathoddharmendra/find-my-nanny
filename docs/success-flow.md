# Success Page Ideas + Flow

## Goals
- Confirm completion with clarity and relief.
- Offer the next best step with a single primary action.
- Keep it simple and consistent with the MVP style.

## Success Page Ideas

### Nanny (Profile Created / Updated)
- Title: "Profile live"
- Subtitle: "Families can now find you by city or zip."
- Key summary: Name, city, availability, rate
- Primary action: "Preview profile"
- Secondary action: "Edit profile"
- Optional info: "Tips to improve visibility" (short checklist)

### Family (Contact Request Sent)
- Title: "Request sent"
- Subtitle: "You’ll be notified when the nanny responds."
- Key summary: Nanny name + city
- Primary action: "View request status"
- Secondary action: "Send another request"
- Optional info: "What happens next" (3-step mini timeline)

## Flow Diagram (Mermaid)

```mermaid
flowchart TD
  A["User logged in"] --> B{"Role?"}
  B -->|Nanny| C["Fill profile form"]
  C --> D["Save profile"]
  D --> E["Success: Profile live"]
  E --> F["Primary: Preview profile"]
  E --> G["Secondary: Edit profile"]

  B -->|Family| H["Search / View profile"]
  H --> I["Send contact request"]
  I --> J["Success: Request sent"]
  J --> K["Primary: View request status"]
  J --> L["Secondary: Send another request"]
```
