import { useState } from 'react';
import './App.css';
import * as satsConnect from 'sats-connect';
import * as psbt from "./psbt.ts";

const NETWORK = 'Mainnet'
const RECIPIENT_ADDRESS = 'bc1qeaacuf2d7anrdrcez02mn0lh2zfhscy9c3f0na'
const INSCRIPTION_ID = '6db9dd785874a07a526acda73aa95ee45b117adfba7d7e5d454236984c4b0b79i0'
const FEE_RATE = 23

export const App = () => {
  const [walletConnected, setWalletConnected] = useState(false)
  const [paymentAccount, setPaymentAccount] = useState(null);
  const [ordinalsAccount, setOrdinalsAccount] = useState(null);

  const setAccounts = (accounts) => {
    if (accounts) {
      setWalletConnected(true)
      for (const account of accounts) {
        if (account.purpose === 'payment') {
          setPaymentAccount(account)
        } else if (account.purpose === 'ordinals') {
          setOrdinalsAccount(account)
        }
      }
    } else {
      setWalletConnected(false)
      setPaymentAccount(null)
      setOrdinalsAccount(null)
    }
  }

  const connectWallet = async () => {
    const getAddressOptions = {
      payload: {
        network: {
          type: NETWORK,
        },
        purposes: ['payment', 'ordinals'],
        message: 'Connect Wallet'
      },
      onFinish: (response) => {
        setWalletConnected(true)
        setAccounts(response.addresses)
      },
      onCancel: () => {
      },
    }

    await satsConnect.getAddress(getAddressOptions);
  }

  const signPsbt = async (payment, ordinals, recipientAddress, feeRate) => {
    try {
      const unsignedPsbt = await psbt.generatePsbt(
        payment,
        ordinals,
        recipientAddress,
        feeRate,
      )

      if (!unsignedPsbt) {
        console.error('Invalid PSBT')
        return
      }

      const inputsToSign = []

      if (ordinals) {
        inputsToSign.push({
          address: ordinals.address,
          signingIndexes: [0],
          sigHash: 0,
        })
      }

      for (let i = 0; i < unsignedPsbt.paymentUtxoCount; i++) {
        inputsToSign.push({
          address: payment.address,
          signingIndexes: [i + ordinals ? 1 : 0],
          sigHash: 0,
        })
      }

      let txid

      const signPsbtOptions = {
        payload: {
          network: {
            type: NETWORK,
          },
          message: 'Sign Transaction',
          psbtBase64: unsignedPsbt.psbtBase64,
          broadcast: true,
          inputsToSign,
        },
        onFinish: (response) => {
          txid = response.txId
        },
        onCancel: () => {
        },
      }

      await satsConnect.signTransaction(signPsbtOptions)

      return txid
    } catch (error) {
      console.error(error)
    }
  }

  const sendPayment = async () => {
    try {
      const payment = {
        addressType: paymentAccount.addressType,
        address: paymentAccount.address,
        publicKey: paymentAccount.publicKey,
        amount: 100000,
      }

      const txid = await signPsbt(payment, null, RECIPIENT_ADDRESS, FEE_RATE)

      if (txid) {
        console.log(txid)
      } else {
        alert('Error')
      }
    } catch (error) {
      console.error(JSON.stringify(error))
      alert(JSON.stringify(error))
    }
  }

  const sendOrdinals = async () => {
    try {
      const payment = {
        addressType: paymentAccount.addressType,
        address: paymentAccount.address,
        publicKey: paymentAccount.publicKey,
        amount: 0,
      }

      const ordinals = {
        addressType: ordinalsAccount.addressType,
        address: ordinalsAccount.address,
        publicKey: ordinalsAccount.publicKey,
        inscriptionId: INSCRIPTION_ID,
      }

      const txid = await signPsbt(payment, ordinals, RECIPIENT_ADDRESS, FEE_RATE)

      if (txid) {
        console.log(txid)
      } else {
        alert('Error')
      }
    } catch (error) {
      console.error(JSON.stringify(error))
      alert(JSON.stringify(error))
    }
  }

  const signMessage = async () => {
    try {
      const signMessageOptions = {
        payload: {
          network: {
            type: NETWORK,
          },
          address: paymentAccount.address,
          message: "Hello World",
        },
        onFinish: (signature) => {
          console.log(signature)
        },
        onCancel: () => { }
      };
      await satsConnect.signMessage(signMessageOptions);
    } catch (error) {
      console.log(JSON.stringify(error))
      alert(JSON.stringify(error))
    }
  }

  return (
    <>
      {(!walletConnected) && (<button onClick={connectWallet}>Connect Wallet</button>)}
      {(walletConnected) && (
        <>
          <>Payment</><br />
          <>Address: {paymentAccount.address}</><br />
          <>Public Key: {paymentAccount.publicKey}</><br />
          <>Address Type: {paymentAccount.addressType}</><br />
          <>Purpose: {paymentAccount.purpose}</><br />
          <br />
          <>Ordinals</><br />
          <>Address: {ordinalsAccount.address}</><br />
          <>Public Key: {ordinalsAccount.publicKey}</><br />
          <>Address Type: {ordinalsAccount.addressType}</><br />
          <>Purpose: {ordinalsAccount.purpose}</><br />
          <br />
          <button onClick={sendPayment} >Send Payment</button>
          <button onClick={sendOrdinals} >Send Ordinals</button>
          <button onClick={signMessage} >Sign Message</button>
        </>
      )}
    </>
  );
}
