using API.DTOs;
using API.Entities;
using API.Helpers;
using API.Interfaces;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.EntityFrameworkCore;

namespace API.Data
{
    public class UserRepository : IUserRepository
    {
        private readonly DataContext _context;
        private readonly IMapper _mapper;
        public UserRepository(DataContext context, IMapper mapper)
        {
            _mapper = mapper;
            _context = context;
        }

        public async Task<MemberDto> GetMemberAsync(string username)
        {
            return await _context.Users
                .Where(x => x.UserName == username)
                .ProjectTo<MemberDto>(_mapper.ConfigurationProvider)
                .SingleOrDefaultAsync();
        }

        public async Task<PagerList<MemberDto>> GetMembersAsync(UserParams userParams)
        {
            var quert = _context.Users.AsQueryable();
                
            quert = quert.Where(u => u.UserName != userParams.CurrentUsername);
            quert = quert.Where(u => u.Gender == userParams.Gender);

            var minDob = DateTime.Today.AddYears(-userParams.MaxAge -1);
            var maxDob = DateTime.Today.AddYears(-userParams.MinAge);

            quert = quert.Where(u => u.DateOfBirth >= minDob && u.DateOfBirth <= maxDob);
            quert = userParams.OrderBy switch
            {
                "created" => quert.OrderByDescending(u => u.Created),
                _ => quert.OrderByDescending(u => u.LastActive)
            };

            return await PagerList<MemberDto>.CreateAsync(quert.ProjectTo<MemberDto>(_mapper.ConfigurationProvider).AsNoTracking(), userParams.PageNumber, userParams.PageSize);
        }

        public async Task<AppUser> GetUserByIfAsync(int id)
        {
            return await _context.Users.FindAsync(id);
        }

        public async Task<AppUser> GetUserByUsernameAsync(string username)
        {
            return await _context.Users
                .Include(p => p.Photos)
                .SingleOrDefaultAsync(x => x.UserName == username);
        }

        public async Task<IEnumerable<AppUser>> GetUsersAsync()
        {
            return await _context.Users
                .Include(p => p.Photos)
                .ToListAsync();
        }

        public async Task<bool> SaveAllAsync()
        {
            return await _context.SaveChangesAsync() > 0;
        }

        public void Update(AppUser user)
        {
            _context.Entry(user).State = EntityState.Modified;
        }
    }
}