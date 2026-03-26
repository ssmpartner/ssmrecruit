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

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>E-Mail-Änderung bestätigen – {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>E-Mail-Änderung bestätigen</Heading>
        <Text style={text}>
          Sie haben eine Änderung Ihrer E-Mail-Adresse für {siteName} von{' '}
          <Link href={`mailto:${email}`} style={link}>
            {email}
          </Link>{' '}
          zu{' '}
          <Link href={`mailto:${newEmail}`} style={link}>
            {newEmail}
          </Link>{' '}
          angefordert.
        </Text>
        <Text style={text}>
          Klicken Sie auf die Schaltfläche, um die Änderung zu bestätigen:
        </Text>
        <Button style={button} href={confirmationUrl}>
          E-Mail-Änderung bestätigen
        </Button>
        <Text style={footer}>
          Falls Sie diese Änderung nicht angefordert haben, sichern Sie bitte
          umgehend Ihr Konto.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

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
