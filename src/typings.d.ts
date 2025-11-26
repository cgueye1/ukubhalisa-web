/**
 * Déclaration globale pour la fonction OneTouch
 */
declare function sendPaymentInfos(
    order_number: string,
    agencyCode: string,
    secureCode: string,
    domainName: string,
    urlSuccess: string,
    urlFailed: string,
    amount: number,
    city: string,
    email: string,
    clientFirstName: string,
    clientLastName: string,
    clientPhone: string
  ): void;