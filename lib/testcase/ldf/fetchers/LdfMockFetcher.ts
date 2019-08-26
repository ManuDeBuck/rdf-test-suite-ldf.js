import { LdfTestCaseEvaluation } from "../LdfTestCaseEvaluationHandler";
import { ClientRequest, IncomingMessage } from "http";
import * as https from 'https';
import * as crypto from 'crypto';

/**
 * Class that fetches the mocked testfiles.
 */
export class LdfMockFetcher {

  /**
   * Parse the mocked testfiles.
   * @param requestedURI The URI of the request the engine requests 
   * @param object The LdfTestCaseEvaluation we're testing 
   * @returns IMockedResponse representing the mocked testfiles
   */
  public static parseMockedResponse(requestedURI: string, object: LdfTestCaseEvaluation, acceptHeader: string): Promise<IMockedResponse> {
    return new Promise((resolve, reject) => {
      let body = '';
      const req: ClientRequest = https.request(this.getMockedFileURI(object.mockFolder, requestedURI, acceptHeader));
      req.on('response', (incoming: IncomingMessage) => {
        incoming.setEncoding('utf8');
        incoming.on('data', (chunk: any) => {
          if(typeof chunk !== 'string')
            throw new Error(`Content of request should be string: ${chunk}`);
          body += chunk;
        });
        incoming.on('end', () => {
          // parse response and return 
          try {
            let headers: any = this.parseMockedFileHeaders(body.split('\n').splice(0,3).join('\n'));
            let response: IMockedResponse = {
              query: headers['Query'],
              iri: headers['Hashed IRI'],
              contentType: headers['Content-type'],
              body: body.split('\n').splice(3,).join('\n'),
            };
            resolve(response);
          } catch(err) {
            reject(err);
          }
        });
      });
      req.end();
    });
  }

  /**
   * Get the URI of the mocked testfile, by hashing the requestedURI and using the
   * URI of the folder containing the testfiles.
   * @param mockFolderURI The URI of the folder containing the mocked testfiles
   * @param requestedURI The URI of the request the engine requests
   */
  private static getMockedFileURI(mockFolderURI: string, requestedURI: string, acceptHeader: string) : string {
    // TODO: Check if mockFolderURI doesn't yet have a trailing slash!
    return mockFolderURI + '/' + crypto.createHash('sha1').update(decodeURIComponent(requestedURI)).digest('hex') + this.getExtensionOnAcceptHeader(acceptHeader);
  }

  /**
   * Depending on the Accept-header of the HTTP request we should find the files under another extension.
   * @param acceptHeader The request Accept-header value
   */
  private static getExtensionOnAcceptHeader(acceptHeader: string) : string {
    switch(acceptHeader){
      case 'application/sparql-results+json':
        return '.srj';
      default: // TODO: Implement this further, change TPF-recorder to .trig
        return '.ttl';
    }
  }

  /**
   * Parse the headers of a mocked testfile (cfr. https://github.com/comunica/ontology-query-testing#README).
   * @param headers The header lines of the mocked testfile.
   * @returns a map with the header values.
   */
  private static parseMockedFileHeaders(headers: string) : any {
    let result: any = {};
    for(let line of headers.split('\n')){
      if(line.indexOf(':') < 0)
        throw new Error(`Mocked testfile does not have valid header line: ${line}`);
      line = line.substring(2,); // Remove '# '
      let key = line.substring(0, line.indexOf(':')).trim(); // Parse key
      let value = line.substring(line.indexOf(':') + 1).trim(); // Parse value
      result[key] = value; // Put in dictionary
    }
    return result;
  }

}

/**
 * Interface representing a mocked testfile.
 */
export interface IMockedResponse {
  query: string;
  iri: string;
  contentType: string;
  body: string;
}