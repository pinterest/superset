/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

// `dom-to-pdf` depends on an ESM build of `jspdf`, which Jest doesn't transpile by default.
// Tests importing `downloadAsPdf`/dashboard header shouldn't need real PDF generation,
// so we stub it out to keep unit tests hermetic.
export default function domToPdf(..._args: unknown[]): Promise<void> {
  return Promise.resolve();
}


