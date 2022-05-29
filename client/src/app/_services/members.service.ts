import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, of, take } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Member } from '../_models/member';
import { PaginatedResult } from '../_models/pagination';
import { User } from '../_models/user';
import { UserParms } from '../_models/userParams';
import { AccountService } from './account.service';

@Injectable({
  providedIn: 'root'
})
export class MembersService {
  baseUrl = environment.apiUrl;
  members: Member[] = [];
  memberCache = new Map();
  userParams: UserParms;
  user: User;

  constructor(
    private http: HttpClient,
    private accountService: AccountService
  ) { 
    this.accountService.currentUser$.pipe(take(1)).subscribe(user => {
      this.user = user;
      this.userParams = new UserParms(user);
    });
  }

  getUserParams() {
    return this.userParams;
  }

  setUserParams(params: UserParms) {
    this.userParams = params;
  }

  resetUserParams() {
    this.userParams = new UserParms(this.user);
    return this.userParams;
  }

  getMembers(userParms: UserParms) {
    var response = this.memberCache.get(Object.values(userParms).join('-'))
    if (response) {
      return of(response)
    }

    let params = this.getPaginationHeaders(userParms.pageNumber, userParms.pageSize);

    params = params.append('minAge', userParms.minAge.toString());
    params = params.append('maxAge', userParms.maxAge.toString());
    params = params.append('gender', userParms.gender);
    params = params.append('orderBy', userParms.orderBy);

    return this.getPaginatedResult<Member[]>(this.baseUrl + 'users',params)
      .pipe(map(response => {
        this.memberCache.set(Object.values(userParms).join('-'), response)
        return response
      }));
  }

  getMember(username) {
    const member = [...this.memberCache.values()]
      .reduce((arr, elem) => arr.concat(elem.result), [])
      .find((member: Member) => member.username === username);

    if (member) {
      return of(member);
    }
    return this.http.get<Member>(this.baseUrl + 'users/' + username);
  }

  updateMember(member: Member) {
    return this.http.put(this.baseUrl + 'users', member).pipe(
      map(() => {
        const index = this.members.indexOf(member);
        this.members[index] = member;
      })
    );
  }

  setMainPhoto(photoId: number) {
    return this.http.put(this.baseUrl + 'users/set-main-photo/' + photoId, {});
  }

  deletePhoto(photoId: number) {
    return this.http.delete(this.baseUrl + 'users/delete-photo/' + photoId);
  }

  private getPaginatedResult<T>(url, params) {
    const paginatedResult: PaginatedResult<T> = new PaginatedResult<T>();
    return this.http.get<T>(url, { observe: 'response', params }).pipe(
      map(repsonse => {
        paginatedResult.result = repsonse.body;
        if (repsonse.headers.get('Pagination') !== null) {
          paginatedResult.pagination = JSON.parse(repsonse.headers.get('Pagination'));
        }
        return paginatedResult;
      })
    );
  }

  private getPaginationHeaders(pageNumber: number, pageSize: number) {
    let params = new HttpParams()
    params = params.append('pageNumber', pageNumber.toString());
    params = params.append('pageSize', pageSize.toString());
    return params;
  }
}