import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { fetchSigningData } from '@/lib/actions/signing';
import SigningForm from '@/components/signing-form';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

interface SignDocumentPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function SignDocumentPage({
  params,
}: SignDocumentPageProps) {
  const { token } = await params;

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Invalid signing link: No token provided.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const signingData = await fetchSigningData({ token });

  // Handle cases where data fetching fails or link is invalid/expired/completed
  if (!signingData) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Link Invalid or Expired</AlertTitle>
          <AlertDescription>
            This signing link is either invalid, has expired, or the document
            has already been completed. Please contact the sender if you believe
            this is an error.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Explicit check to satisfy TypeScript before accessing potentially null properties
  if (!signingData.document || !signingData.contact) {
    console.error(
      'Data inconsistency: Document or contact missing despite passing initial checks.',
      signingData,
    );
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            An unexpected error occurred while loading signing data. Please
            contact support.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Now we know document and contact are not null
  const { document, contact, fields } = signingData;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4 md:p-8">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Sign Document: {document.title}</CardTitle>
          <CardDescription>You are signing as: {contact.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <SigningForm
            document={document}
            fields={fields}
            contact={contact}
            token={token}
          />
        </CardContent>
      </Card>
    </div>
  );
}
