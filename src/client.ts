import { loadService } from "@dcl/rpc/dist/codegen"
import { RpcClientPort } from "@dcl/rpc"
import { BookServiceDefinition } from "./api"
import WebSocket from "ws"
import { createRpcClient } from "@dcl/rpc"
import expect from "expect"
import { Book } from "./api"
import { WebSocketTransport } from "@dcl/rpc/dist/transports/WebSocket"
import { context } from "./server" // Just to check equality

// this function loads the remote BookService using the specified port
// this is the function that will be most likely used in clients to consume
// remote APIs
export const createBookServiceClient = <Context>(clientPort: RpcClientPort) => loadService<Context, BookServiceDefinition>(clientPort, BookServiceDefinition)

export const runClient = () => {
    const ws = new WebSocket("ws://localhost:8080/")
    const clientSocket = WebSocketTransport(ws as any)
    // 4th step: create a client connection
    console.log("> Creating client")
    const clientPromise = createRpcClient(clientSocket)
    
    async function handleClientCreation() {
      // 6th step: once connected to the server, ask the server to create a port
      const client = await clientPromise
      console.log("  Client created!")
      console.log("> Creating client port")
      const clientPort = await client.createPort("my-port")
      // 7th step: with the port, ask te server to create a BookService instance for us
      //           now the step 2.1 will be called
      console.log("> Requesting BookService client")
      const clientBookService = createBookServiceClient(clientPort)
    
      // 8th step: profit
      console.log("> Invoking BookService.getBook(isbn:19997)")
      const response = await clientBookService.getBook({ isbn: 19997 })
      console.log("  Response: ", response)
      expect(response).toEqual({
        author: "menduz",
        isbn: 19997,
        title: "Rpc onion layers",
      })
    
      const list: Book[] = []
      for await (const book of clientBookService.queryBooks({ authorPrefix: "mr" })) {
        list.push(book)
      }
      expect(list).toEqual(context.hardcodedDatabase)

      clientSocket.close()
    }
    
    handleClientCreation().catch((err) => {
      process.exitCode = 1
      console.error(err)
    })
    
}