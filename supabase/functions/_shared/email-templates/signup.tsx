/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>E-Mail-Adresse bestätigen – {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>E-Mail bestätigen</Heading>
        <Text style={text}>
          Vielen Dank für Ihre Registrierung bei{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Bitte bestätigen Sie Ihre E-Mail-Adresse (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ), indem Sie auf die Schaltfläche klicken:
        </Text>
        <Button style={button} href={confirmationUrl}>
          E-Mail bestätigen
        </Button>
        <Text style={footer}>
          Falls Sie kein Konto erstellt haben, können Sie diese E-Mail ignorieren.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(0, 0%, 12%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(0, 0%, 45%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(168, 17%, 23%)',
  color: 'hsl(60, 10%, 95%)',
  fontSize: '14px',
  borderRadius: '0.75rem',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: 'hsl(0, 0%, 60%)', margin: '30px 0 0' }
