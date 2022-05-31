import * as codegen from "@dcl/rpc/dist/codegen"
import { createRpcServer, RpcServerPort } from "@dcl/rpc"
import expect from "expect"
import { Book, BookServiceDefinition, GetBookRequest, QueryBooksRequest } from "./api"
import { WebSocketTransport } from "@dcl/rpc/dist/transports/WebSocket"
import { WebSocketServer } from "ws"

// This file creates the server implementation of BookService defined in api.proto

const FAIL_WITH_EXCEPTION_ISBN = 1

export type TestContext = { hardcodedDatabase: Book[] }

// This function registers the BookService into the given RpcServerPort
export function registerBookServiceServerImplementation(port: RpcServerPort<TestContext>) {
  codegen.registerService(port, BookServiceDefinition, async () => ({
    async getBook(req: GetBookRequest, context) {
      if (req.isbn == FAIL_WITH_EXCEPTION_ISBN) throw new Error("ErrorMessage")

      // assert context is OK
      expect(context.hardcodedDatabase).toHaveLength(4)

      return {
        author: "menduz",
        isbn: req.isbn,
        title: "Rpc onion layers",
      }
    },
    async *queryBooks(req: QueryBooksRequest, context) {
      if (req.authorPrefix == "fail_before_yield") throw new Error("fail_before_yield")

      for (const book of context.hardcodedDatabase) {
        if (book.author.includes(req.authorPrefix)) {
          yield book
        }
      }

      if (req.authorPrefix == "fail_before_end") throw new Error("fail_before_end")
    },
  }))
}

// this emulates a server context with components
export const context: TestContext = {
  hardcodedDatabase: [
    { author: "mr menduz", isbn: 1234, title: "1001 reasons to write your own OS" },
    { author: "mr cazala", isbn: 1111, title: "Advanced CSS" },
    { author: "mr mannakia", isbn: 7666, title: "Advanced binary packing" },
    { author: "mr kuruk", isbn: 7668, title: "Advanced bots AI" },
  ],
}

export const runServer = () => {

  console.log("> Creating server")
  const rpcServer = createRpcServer<TestContext>({})
  // the handler function will be called every time a port is created.
  // it should register the available APIs/Modules for the specified port
  rpcServer.setHandler(async function handler(port) {
    console.log("  Creating server port: " + port.portName)
    registerBookServiceServerImplementation(port)
  })

  console.log("> Creating client and server MemoryTransport")
  const wss = new WebSocketServer({ port: 8080 })
  wss.on('connection', function connection(ws: any, req: any) {
    const serverSocket = WebSocketTransport(ws)

    // connect the "socket" to the server
    console.log("> Attaching transport")
    rpcServer.attachTransport(serverSocket, context)

    wss.close()
  })
}